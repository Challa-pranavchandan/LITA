import { MedusaService } from "@medusajs/framework/utils"
import Feedback from "./models/feedback"

class FeedbackModuleService extends MedusaService({ Feedback }) {}
export default FeedbackModuleService
