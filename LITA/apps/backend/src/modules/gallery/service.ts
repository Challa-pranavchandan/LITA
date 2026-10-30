import { MedusaService } from "@medusajs/framework/utils"
import GalleryItem from "./models/gallery-item"

class GalleryModuleService extends MedusaService({ GalleryItem }) {}

export default GalleryModuleService
