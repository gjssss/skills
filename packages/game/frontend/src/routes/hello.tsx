import { useEffect, useState } from 'react'

type HelloResponse = {
  message: string
  time: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'success', data: HelloResponse }
  | { status: 'error', message: string }

export function HelloPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let active = true

    fetch('/api/hello')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return response.json() as Promise<HelloResponse>
      })
      .then((data) => {
        if (active) {
          setState({ status: 'success', data })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : '请求失败',
          })
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="content-page">
      <div className="section-heading">
        <h1>API 示例</h1>
        <p>这个页面请求 bundled backend 的 <code>/api/hello</code>。</p>
      </div>
      <div className="result-box">
        {state.status === 'loading' && <p>正在请求后端...</p>}
        {state.status === 'error' && (
          <p role="alert">请求失败：{state.message}</p>
        )}
        {state.status === 'success' && (
          <dl>
            <div>
              <dt>Message</dt>
              <dd>{state.data.message}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{state.data.time}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  )
}
