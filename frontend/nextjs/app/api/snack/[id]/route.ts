import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { snackSearchParamsCache } from '@/features/snack/types/snack.type'
import { selectSnack } from '@/features/snack/services/snack.service'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

/**
 * @description 상세 조회
 */
// export async function GET(request: NextRequest, { params }: RouteContext) {
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    /* if (Number.isNaN(id)) {
      return NextResponse.json({ message: '잘못된 ID입니다.' }, { status: 400 })
    } */

    // const data = await selectSnack(id)

    /* TODO: 단건 조회 API 는 반드시 배열([]) 대신 단건({}) 데이터 호출
    json-server 에서 단건도 배열 데이터라 일단 처리하지만 find() 없이 사용하는 게 일반적 */
    // const jsonData = (await selectSnack(id)) as Array<unknown>
    const jsonData = (await selectSnack(id)) as Array<{ id: string }>
    const data = jsonData.find(item => item.id === id)

    if (!data) {
      return NextResponse.json(
        { message: '데이터가 존재하지 않습니다.' },
        { status: 404 }
      )
    }

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
