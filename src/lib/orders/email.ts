import { env } from "@/env"
import { addressLines } from "@/lib/address/validations"
import { formatPrice } from "@/lib/catalog/format"
import { prisma } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/mailer"
import { orderConfirmationEmail } from "@/lib/email/templates"

/** Emails the customer what they ordered. The order is read again, so the email says what was stored. */
export async function sendOrderConfirmation(
  orderId: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      number: true,
      paymentMethod: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      shipName: true,
      shipLine1: true,
      shipLine2: true,
      shipCity: true,
      shipRegion: true,
      shipPostalCode: true,
      shipCountry: true,
      user: { select: { name: true, email: true } },
      items: {
        select: {
          name: true,
          size: true,
          quantity: true,
          unitPriceCents: true,
        },
        orderBy: { id: "asc" },
      },
    },
  })
  // an account deleted in the meantime has nobody to tell
  if (!order?.user) return

  await sendEmail({
    to: order.user.email,
    ...orderConfirmationEmail({
      name: order.user.name,
      number: order.number,
      url: `${env.NEXT_PUBLIC_APP_URL}/account/orders/${order.number}`,
      items: order.items.map(
        (item) =>
          `${item.quantity} × ${item.name} (${item.size}): ${formatPrice(item.unitPriceCents * item.quantity)}`
      ),
      totals: [
        `Subtotal: ${formatPrice(order.subtotalCents)}`,
        `Shipping: ${order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}`,
        `Total: ${formatPrice(order.totalCents)} (${order.paymentMethod === "CARD" ? "paid by card" : "pay in cash on delivery"})`,
      ],
      address: addressLines({
        fullName: order.shipName,
        line1: order.shipLine1,
        line2: order.shipLine2,
        city: order.shipCity,
        region: order.shipRegion,
        postalCode: order.shipPostalCode,
        country: order.shipCountry,
      }),
    }),
  })
}
