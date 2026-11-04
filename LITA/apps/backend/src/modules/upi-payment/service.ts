import { MedusaService } from "@medusajs/framework/utils"
import UpiPayment from "./models/upi-payment"

class UpiPaymentModuleService extends MedusaService({
  UpiPayment,
}) {}

export default UpiPaymentModuleService
