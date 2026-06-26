import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { snackSearchParamsCache } from '@/features/snack/types/snack.type'
import { selectManySnack } from '@/features/snack/services/snack.service'

/**
 * @description 목록 조회 (검색/필터/페이징)
 * @example /api/snack?page=1&brand=001&category=002
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    /* const query = Object.fromEntries(searchParams.entries())
    const payload = createSnackSchema.parse(query) */
    // const payload = createSnackSchema.safeParse(query)

    // TODO: 검색/필터/페이징/정렬
    // nuqs cache 를 사용하여 파싱 (타입 안전성 보장)
    const query = Object.fromEntries(searchParams.entries())
    const payload = snackSearchParamsCache.parse(query)
    const data = await selectManySnack(payload)

    // revalidatePath('/snack')

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
