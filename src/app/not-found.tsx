import Link from "next/link"

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        The page you are looking for does not exist or has
        moved.
      </p>
      <Link href="/">Back to home</Link>
    </main>
  )
}
