import { authHandlers } from './auth'
import { residentHandlers } from './residents'
import { houseHandlers } from './houses'
import { dueTypeHandlers } from './due-types'
import { billHandlers } from './bills'
import { paymentHandlers } from './payments'
import { expenseHandlers } from './expenses'
import { reportHandlers } from './reports'
import { userHandlers } from './users'

export const handlers = [
  ...authHandlers,
  ...residentHandlers,
  ...houseHandlers,
  ...dueTypeHandlers,
  ...billHandlers,
  ...paymentHandlers,
  ...expenseHandlers,
  ...reportHandlers,
  ...userHandlers,
]
