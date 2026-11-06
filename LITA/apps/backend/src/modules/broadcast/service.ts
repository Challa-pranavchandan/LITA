import { MedusaService } from "@medusajs/framework/utils"
import Broadcast from "./models/broadcast"

class BroadcastModuleService extends MedusaService({
  Broadcast,
}) {}

export default BroadcastModuleService
