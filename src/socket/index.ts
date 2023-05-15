import { Server, Socket } from 'socket.io';
import { DUsers } from '../model';
import { currentTime, setlog } from '../helper';

const ObjectId = require('mongodb').ObjectId;
const random = require('random-seed').create();

interface UserType {
  socketId: string;
  userid: string;
  name: string;
  img: string;
  balance: number;
  betAmount: number;
  mineCount: number;
  minePlace: number[];
  gridSystem: boolean[];
  turboMode: boolean;
  turboList: number[];
  profitCalcList: number[];
}

const makeGridSystem = async (gridCount: number, wicketCount: number) => {
  let minePlace: number[] = [];
  while (minePlace.length < wicketCount) {
    const ran = random.intBetween(0, gridCount * gridCount - 1);
    minePlace.indexOf(ran) < 0 && minePlace.push(ran);
  }
  minePlace.sort((a: number, b: number) => {
    return a - b;
  });

  let gridSystem: boolean[] = new Array(gridCount * gridCount).fill(false);
  minePlace.map((item: number) => {
    gridSystem[item] = true;
  });

  return { minePlace, gridSystem };
};

const updateBalance = async (userid: string, status: string, amount: number) => {
  if (!users[userid]) {
    return {
      status: false,
      message: 'Undefined user',
      amount: null
    };
  }

  const user = await DUsers.findOne({ _id: new ObjectId(userid) });

  if (!user) {
    return { status: false, message: 'Undefined user', amount: null };
  }

  let calc:number = user.balance;
  switch (status) {
    case 'playBet':
      calc = calc - amount;
      break;
    case 'cancelBet':
      calc = calc + amount;
      break;
    case 'cashOut':
      calc = calc + amount;
  }

  const update = await DUsers.updateOne(
    { _id: new ObjectId(userid) },
    { $set: { balance: calc, updated: currentTime() } }
  );

  if (!update) {
    return { status: false, message: 'User balance updating is failed', amount: null };
  }

  return { status: true, message: 'Successfully', amount: calc };
};

const checkMine = async (userid: string, order: number) => {
  if (!users[userid]) {
    return {
      status: false,
      message: 'Undefined user',
      minePlace: [],
      index: -1,
      mine: null
    };
  }
  return {
    status: true,
    message: 'Successfully',
    index: order,
    minePlace: users[userid].minePlace,
    mine: users[userid].gridSystem[order]
  };
};

const makeProfitCalcList = async (userid: string, gridCount: number, wicketCount: number) => {
  if (!users[userid]) {
    return {
      status: false,
      message: 'Undefined user',
      list: []
    };
  }
  let list: number[] = [];
  let first = 0.95 / ((gridCount * gridCount - wicketCount) / (gridCount * gridCount));
  list.push(Number(first.toFixed(2)));
  for (let i = gridCount * gridCount - wicketCount - 1; i > 0; i--) {
    first /= i / (i + wicketCount);
    list.push(Number(first.toFixed(2)));
  }

  return {
    status: true,
    message: 'Successfully',
    list
  };
};

let users = {} as { [key: string]: UserType };

export const initSocket = (io: Server) => {
  io.on('connection', async (socket: Socket) => {
    console.log('new User connected:' + socket.id);

    socket.on('disconnect', () => {
      console.log('socket disconnected ' + socket.id);
    });

    socket.on('join', async (req: any) => {
      users[req.userid] = {
        socketId: socket.id,
        userid: req.userid,
        name: req.name,
        img: req.img,
        balance: req.balance,
        betAmount: 0,
        mineCount: 0,
        minePlace: [],
        gridSystem: [],
        turboMode: false,
        turboList: [],
        profitCalcList: []
      };
    });

    socket.on('setProfitCalcList', async (req: any) => {
      const result = await makeProfitCalcList(req.userid, req.gridCount, req.mineCount);
      
      if (result.status) {
        users[req.userid] = {
          ...users[req.userid],
          profitCalcList: result.list
        };

        socket.emit(`setProfitCalcList-${req.userid}`, { profitCalcList: result.list });
      } else {
        setlog('setProfitList error', `${req.userid}=>${result.message}`);
        socket.emit(`error-${req.userid}`, result.message);
      }
    });

    socket.on('playBet', async (req: any) => {
      const system = await makeGridSystem(req.gridCount, req.mineCount);
      const result = await updateBalance(req.userid, 'playBet', req.betAmount);

      if (result.status) {
        users[req.userid] = {
          ...users[req.userid],
          balance: result.amount,
          betAmount: req.betAmount,
          mineCount: req.mineCount,
          minePlace: system.minePlace,
          gridSystem: system.gridSystem,
          turboMode: req.turboMode,
          turboList: req.turboList,
        };

        if (req.turboMode) {
          const count = users[req.userid].turboList.filter((item) => users[req.userid].gridSystem[item]).length;
          const balance = count > 0 ? result.amount : (await updateBalance(req.userid, 'cashOut', req.betAmount * req.profitValue)).amount;
          socket.emit(`playBet-${req.userid}`, {
            balance: balance,
            turboMode: req.turboMode,
            mine: count > 0 ? true : false,
            gridSystem: system.gridSystem,
          });
        } else {
          socket.emit(`playBet-${req.userid}`, { balance: result.amount, turboMode: req.turboMode });
        }
      } else {
        setlog('playBet error', `${req.userid}=>${result.message}`);
        socket.emit(`error-${req.userid}`, result.message);
      }
    });

    socket.on('cancelBet', async (req: any) => {
      let result = await updateBalance(req.userid, 'cancelBet', req.betAmount);

      if (result.status) {
        users[req.userid] = {
          ...users[req.userid],
          balance: result.amount
        };
        socket.emit(`cancelBet-${req.userid}`, { balance: result.amount });
      } else {
        setlog('cancelBet error', `${req.userid}=>${result.message}`);
        socket.emit(`error-${req.userid}`, result.message);
      }
    });

    socket.on('cashOut', async (req: any) => {
      if (users[req.userid]) { 
        const result = await updateBalance(req.userid, 'cashOut', req.profitValue * users[req.userid].betAmount);
        users[req.userid] = {
          ...users[req.userid],
          balance: result.amount
        };
        socket.emit(`cashOut-${req.userid}`, { balance: result.amount });
      } else {
        setlog('cashOut error', `${req.userid}=> Undefined user`);
        socket.emit(`error-${req.userid}`, 'Undefined user');
      }
    })

    socket.on('checkMine', async (req: any) => {
      const result = await checkMine(req.userid, req.order);

      if (result.status) {
        socket.emit(`checkMine-${req.userid}`, { mine: result.mine, index: result.index, minePlace: result.minePlace });
      } else {
        setlog('checkMine error', `${req.userid}=>${result.message}`);
        socket.emit(`error-${req.userid}`, result.message);
      }
    });
  });
};