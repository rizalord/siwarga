import { activityLogHandlers } from './activity-logs'
import { authHandlers } from './auth'
import { billHandlers } from './bills'
import { dueTypeHandlers } from './due-types'
import { expenseHandlers } from './expenses'
import { houseHandlers } from './houses'
import { paymentHandlers } from './payments'
import { permissionHandlers } from './permissions'
import { reportHandlers } from './reports'
import { residentHandlers } from './residents'
import { roleHandlers } from './roles'
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
  ...roleHandlers,
  ...permissionHandlers,
  ...activityLogHandlers,
]
