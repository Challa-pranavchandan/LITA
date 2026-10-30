import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { PostTradeApplicationSchema } from "../../middlewares"
import {
  createTradeApplicationWorkflow,
  listCustomerTradeApplicationsWorkflow,
} from "../../../workflows/trade-applications"

type Body = z.infer<typeof PostTradeApplicationSchema>

// TODO(B6): Add shared distributed rate limiter and Turnstile/hCaptcha verification hook
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const { result } = await createTradeApplicationWorkflow(req.scope).run({
    input: {
      name: req.validatedBody.name,
      email: req.validatedBody.email,
      company: req.validatedBody.company,
      role: req.validatedBody.role,
      phone: req.validatedBody.phone,
      website: req.validatedBody.website,
      message: req.validatedBody.message,
    },
  })

  const statusCode = result.isExisting ? 200 : 201
  return res.status(statusCode).json({ application: result.application })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const authContext = (req as any).auth_context
  const actorId = authContext?.actor_id

  if (!actorId) {
    return res.status(401).json({
      message: "Customer authentication required.",
    })
  }

  const { result } = await listCustomerTradeApplicationsWorkflow(req.scope).run({
    input: {
      customerId: actorId,
    },
  })

  return res.json(result)
}
