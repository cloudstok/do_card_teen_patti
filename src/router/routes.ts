import { Router, Request, Response } from 'express';

const routes = Router();

routes.get('/', async (req: Request, res: Response) => {
  res.send({ status: true, msg: '2 Card Teen Patti Game Testing Successfully 👍' });
});

export { routes };
