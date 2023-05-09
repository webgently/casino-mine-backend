import express from 'express';
import { register } from './controllers/user';

const routers = express.Router();

routers.post('/register', register);

export default routers;
