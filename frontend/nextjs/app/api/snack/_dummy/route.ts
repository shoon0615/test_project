import { NextRequest, NextResponse } from 'next/server'
import { api } from '@/shared/lib/axios/core'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import {
  selectAllSnack,
  selectManySnack
} from '@/features/snack/services/snack.service'

const apiUrl = '/snacks'

/* type Context = {
  params: Promise<{
    keyword?: string
  }>
}

export async function GET(request: NextRequest, params: Context) { */
export async function GET(
  request: NextRequest,
  params: Promise<{ keyword?: string }>
) {
  try {
    const { keyword } = await params
    // const searchParams = request.nextUrl.searchParams

    // const body = await request.json()

    // const payload = createSnackSchema.parse(body)

    // const data = await api.get(`${process.env.PRIVATE_URL}`).then(res => res.data)
    const data = await selectAllSnack()

    // revalidatePath('/snack')

    // return NextResponse.json(data, { status: 201 })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid request', errors: z.treeifyError(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// findMany: (params: SnackSearchParams) => api.get<Snack[]>(`${apiUrl}${toQueryString(params)}`).then(res => res.data),

/* import { selectAllSnack } from '@/features/snack/services/snack.service'
import { NextResponse } from 'next/server'
export async function GET() {
  const data = await selectAllSnack()
  // return Response.json(data)
  
  const validated = SnackArraySchema.parse(data)  // 응답 검증 추가
  // const validated = SnackArraySchema.safeParse(data)
  return NextResponse.json(validated)
} */

/* --- */

// app/api/snacks/route.ts = Server Action 도 동일
/* import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import axios from 'axios'
import { createSnackSchema } from '@/features/snacks/schemas/snack.schema'
import { createSnackService } from '@/features/snacks/services/snack.service'

export async function POST(request: NextRequest) {
  try {
    // 1. request parsing
    const body = await request.json()

    // 2. validation
    const payload = createSnackSchema.parse(body)

    // 3. server logic
    const result = await axios.post(`${process.env.PRIVATE_URL}`, payload).then(res => res.data)

    // 4. revalidate/cache
    revalidatePath('/snack')

    // 3~4. service
    // const result = await createSnackService(payload)

    // 5. response
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // 6. error
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        // { message: 'Invalid request', errors: error.flatten() },
        { message: 'Invalid request', errors: z.treeifyError(error) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// features/snacks/services/snack.service.ts
import 'server-only'
export async function createSnackService(input: CreateSnackInput) {
  const snack = await createSnackRepository(input)
  revalidatePath('/snack')
  return snack
} */
