export function GET(req: Request) {
  return Response.json({ healthcheck: `ok`, method: req.method });
}

export function POST(req: Request) {
  return Response.json({ healthcheck: `ok`, method: req.method });
}
