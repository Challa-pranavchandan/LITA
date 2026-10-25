import { MedusaService } from "@medusajs/framework/utils"
import JournalPost from "./models/journal-post"

class JournalModuleService extends MedusaService({ JournalPost }) {}

export default JournalModuleService
