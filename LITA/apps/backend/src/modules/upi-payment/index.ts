import { Module } from "@medusajs/framework/utils"
import UpiPaymentModuleService from "./service"

export const UPI_PAYMENT_MODULE = "upi_payment"

export default Module(UPI_PAYMENT_MODULE, {
  service: UpiPaymentModuleService,
})
