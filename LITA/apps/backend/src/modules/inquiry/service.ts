import { MedusaService } from "@medusajs/framework/utils"
import Inquiry from "./models/inquiry"
import NewsletterSubscriber from "./models/newsletter-subscriber"

class InquiryModuleService extends MedusaService({
  Inquiry,
  NewsletterSubscriber,
}) {}

export default InquiryModuleService
