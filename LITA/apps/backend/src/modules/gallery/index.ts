import { Module } from "@medusajs/framework/utils"
import GalleryModuleService from "./service"

export const GALLERY_MODULE = "gallery"

export default Module(GALLERY_MODULE, { service: GalleryModuleService })
