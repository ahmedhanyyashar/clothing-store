import type { Metadata, Route } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listAudit } from "@/lib/admin/audit"
import { requireRole } from "@/lib/auth/session"

export const metadata: Metadata = { title: "Audit log" }

const when = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
})

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireRole("ADMIN", "/admin/audit")
  const { page: raw } = await searchParams
  const page = Math.max(
    1,
    Number.parseInt(raw ?? "1", 10) || 1
  )

  const { entries, total, pageCount } =
    await listAudit(page)
  // a page past the end is as missing as any other address
  if (page > pageCount) notFound()
  const href = (n: number) =>
    `/admin/audit?page=${n}` as Route

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">Audit log</h2>
        <p className="text-sm text-muted-foreground">
          Every change made by an admin or an operator,
          newest first. Times are UTC.
        </p>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground">
          Nothing has been recorded yet.
        </p>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableCaption className="sr-only">
              Audit log
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>What</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {when.format(entry.createdAt)}
                  </TableCell>
                  <TableCell>{entry.actorLabel}</TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.summary}
                    <span className="block text-xs text-muted-foreground">
                      {entry.action} · {entry.targetType}{" "}
                      {entry.targetId}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Audit log pages"
          className="flex items-center gap-3 text-sm"
        >
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page - 1)}>Newer</Link>
            </Button>
          )}
          <span>
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(page + 1)}>Older</Link>
            </Button>
          )}
        </nav>
      )}
    </>
  )
}
