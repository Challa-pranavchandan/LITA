import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TRADE_MODULE } from "../../../modules/trade"
import TradeModuleService from "../../../modules/trade/service"
import { z } from "zod"
import { PostTradeApplicationSchema } from "../../middlewares"

type Body = z.infer<typeof PostTradeApplicationSchema>

export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)
  const { name, email, company, role, phone, website, message } = req.validatedBody

  const application = await svc.createTradeApplications({
    name: name.trim(),
    email: email.trim(),
    company: company?.trim() || null,
    role: role?.trim() || null,
    phone: phone?.trim() || null,
    website: website?.trim() || null,
    message: message?.trim() || null,
  })

  res.status(201).json({ application })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: TradeModuleService = req.scope.resolve(TRADE_MODULE)

  let customerEmail = (req.query.email as string | undefined)?.trim()

  const authContext = (req as any).auth_context
  if (authContext?.actor_id) {
    try {
      const customerService: any = req.scope.resolve("customer")
      const customer = await customerService.retrieveCustomer(authContext.actor_id)
      if (customer?.email) {
        customerEmail = customer.email
      }
    } catch {
      // ignore
    }
  }

  if (!customerEmail) {
    return res.status(400).json({
      message: "Customer authentication or email query parameter is required.",
    })
  }

  const [allApps] = await svc.listAndCountTradeApplications(
    {},
    { order: { created_at: "DESC" }, take: 100 }
  )

  const emailLower = customerEmail.toLowerCase()
  const applications = allApps.filter(
    (app) => app.email?.toLowerCase().trim() === emailLower
  )

  return res.json({
    application: applications[0] || null,
    applications,
    count: applications.length,
  })
}
