import { MedusaService } from "@medusajs/framework/utils"
import { Commission } from "./models/commission"
import { CommissionMessage } from "./models/commission-message"

class CommissionModuleService extends MedusaService({
  Commission,
  CommissionMessage,
}) {}

export default CommissionModuleService
