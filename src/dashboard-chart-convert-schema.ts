import {
  object,
  string,
  number,
  mixed,
  array,
} from 'yup';

export const dataPointSchema = object().shape({
  timestamp: number().required(),
  values: array().of(
    object().shape({
      id: string().required(),
      value: number().required(),
    }),
  ),
});
