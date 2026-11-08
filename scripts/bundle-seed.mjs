// node scripts/bundle-seed.mjs
//
// Bundles the seed (including the demo data) into one file, seed.mjs, that runs
// with plain `node` and needs no source files or dev tools. The app image
// carries it, so a one-off task can load the demo data into a database that
// can only be reached from inside the network (see .github/workflows/seed.yml).
import { build } from "esbuild"

await build({
  entryPoints: ["prisma/seed.ts"],
  outfile: "seed.mjs",
  bundle: true,
  platform: "node",
  // the generated database client uses import.meta, which only modules have
  format: "esm",
  target: "node24",
  external: ["pg-native"],
  // some bundled libraries still call require()
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
})
