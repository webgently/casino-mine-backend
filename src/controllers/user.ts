import { Request, Response } from 'express';
import { DHistories, DUsers } from '../model';
import { currentTime, setlog } from '../helper';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, img, balance } = req.body;

    const now = currentTime();
    const oldUser = await DUsers.findOne({ name });

    if (!oldUser) {
      const user = await DUsers.insertOne({
        name,
        img,
        balance,
        updated: now,
        created: now
      });

      const data = {
        userid: user.insertedId,
        name,
        img,
        balance
      };
      return res.send({ status: true, code: 201, data: data, message: 'User created successfully, please login' });
    } else {
      return res.send({ status: false, code: 409, message: 'Current User Already Exist.' });
    }
  } catch (error) {
    console.log('register error : ', error.message);
    setlog('register error', error.message);
    res.status(500).send(error.message);
  }
};

export const saveBetHistory = async (req: Request, res: Response) => {
  try {
    const { user_id, betAmount, cashoutAt, cashouted } = req.body;

    const now = currentTime();

    // await DHistories.insertOne({
    //   user_id,
    //   betAmount,
    //   date: now
    // });
  } catch (error) {
    console.log('Save Bet History error : ', error.message);
    setlog('Save Bet History error', error.message);
    res.status(500).send(error.message);
  }
};
