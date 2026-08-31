export async function GET() {
  try {
    // 返回已弃用的消息
    return Response.json(
      { message: 'Stats API has been deprecated and is no longer available.' },
      {
        status: 410, // Gone 状态码表示资源已永久移除
      }
    )
  } catch (e) {
    console.error(e)
    return Response.json(
      { message: 'Internal Server Error!' },
      {
        status: 500,
      }
    )
  }
}

export async function POST() {
  try {
    // 返回已弃用的消息
    return Response.json(
      { message: 'Stats API has been deprecated and is no longer available.' },
      {
        status: 410, // Gone 状态码表示资源已永久移除
      }
    )
  } catch (e) {
    console.error(e)
    return Response.json({ message: 'Internal Server Error!' }, { status: 500 })
  }
}
