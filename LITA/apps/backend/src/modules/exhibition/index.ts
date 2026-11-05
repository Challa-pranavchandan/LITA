import { Module } from "@medusajs/framework/utils"
import ExhibitionModuleService from "./service"

export const EXHIBITION_MODULE = "exhibition"

export default Module(EXHIBITION_MODULE, {
  service: ExhibitionModuleService,
})
