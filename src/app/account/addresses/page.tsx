import type { Metadata } from "next"
import Link from "next/link"

import { AddressActions } from "@/components/address/AddressActions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listAddresses } from "@/lib/address/queries"
import {
  addressLines,
  MAX_ADDRESSES,
} from "@/lib/address/validations"
import { requireUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Addresses" }

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses")
  const addresses = await listAddresses(user.id)
  const full = addresses.length >= MAX_ADDRESSES

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Saved addresses
          </h2>
          <p className="text-sm text-muted-foreground">
            {full
              ? `You have reached the limit of ${MAX_ADDRESSES}. Delete one to add another.`
              : "Where your orders can be delivered."}
          </p>
        </div>
        {!full && (
          <Button asChild>
            <Link href="/account/addresses/new">
              Add address
            </Link>
          </Button>
        )}
      </div>

      {addresses.length === 0 ? (
        <p className="text-muted-foreground">
          You have no saved addresses yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {addresses.map((address) => {
            const name = address.label ?? address.line1
            return (
              <li key={address.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {name}
                      {address.isDefault && (
                        <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {address.phone}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <address className="text-sm not-italic">
                      {addressLines(address).map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </address>
                    {address.notes && (
                      <p className="text-sm text-muted-foreground">
                        Note: {address.notes}
                      </p>
                    )}
                    <AddressActions
                      id={address.id}
                      name={name}
                      isDefault={address.isDefault}
                    />
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
