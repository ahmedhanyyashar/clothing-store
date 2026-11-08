import type { Metadata } from "next"

import { ProductForm } from "@/components/admin/ProductForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireRole } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Add product" }

export default async function NewProductPage() {
  await requireRole("ADMIN", "/admin/products/new")

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Add a product</h2>
        </CardTitle>
        <CardDescription>
          Photos are not managed on this page. A product
          without any shows a placeholder in the shop.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm />
      </CardContent>
    </Card>
  )
}
