import {
  object,
  string,
  mixed,
} from 'yup';

export const thingCommandSchema = object().shape({
  payload: object().shape({
    topic: string().required(),
    commandId: string().required(),
    value: mixed().required(),
  }),
});
