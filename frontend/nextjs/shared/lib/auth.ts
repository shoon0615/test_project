import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

/**
 * 로그인(회원가입) => signIn => (redirect) => jwt => session
 * @param handlers 인증 관리 API Route(GET/POST)
 * @param signIn (비동기) 사용자 로그인 시도
 * @param signOut (비동기) 사용자 로그아웃 시도
 * @param auth (비동기) 세션 정보 반환
 * @param update (비동기) 세션 정보 갱신
 */
export const {
  handlers,
  signIn,
  signOut,
  auth,
  unstable_update: update // Beta!
} = NextAuth({
  /* (필수) 인증 공급자 지정 → Credentials, Google/Github */
  providers: [
    Credentials({
      /* credentials 데이터 및 타입 설정 */
      /* credentials: {
        email: {},
        password: {}
        // email: { label: 'Email', type: 'email' },
        // password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = signinSchema.safeParse(credentials)
        if (!parsed.success) return null
        // errors: parsed.error.flatten().fieldErrors

        const user = await userService.findByEmail(parsed.data.email)
        if (!user?.passwordHash) return null

        const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!isValidPassword) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role
        }
      } */
      /* 반환하는 사용자 정보(user, accessToken) 는 로그인이 성공하면 callbacks.jwt 함수의 user 변수로 전달됨 */
      authorize: async credentials => {
        const { displayName, email, password } = credentials
        // const user = { id: '', name: '', email: '', image: '' }
        const user = {
          id: '',
          name: String(displayName),
          email: String(email),
          image: ''
        }

        try {
          const result = {
            ...user,
            accessToken: '<ACCESS_TOKEN>'
          }

          // 사용자 이름이 있는 경우, 회원가입!
          if (displayName) {
            // <회원가입 로직 ...>
            // return user
            return result
            // return _signIn('signup', result)
          }

          // <로그인 로직 ...>
          return result
          // return _signIn('login', result)
        } catch (error) {
          throw new Error(error.message)
        }
      }
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: 'consent' // 사용자에게 항상 동의 화면을 표시하도록 강제!
        }
      }
    })
  ],
  /* (선택) 세션 관리 방식 지정 */
  session: {
    strategy: 'jwt', // JSON Web Token 사용
    maxAge: 60 * 60 * 24 // 세션 만료 시간(sec)
  },
  /* (선택) 사용자 정의 페이지 경로 지정 */
  pages: {
    signIn: '/signin' // Default: '/auth/signin'
  },
  callbacks: {
    /* 로그인 시도 시 호출(true: 성공, false: 실패) */
    signIn: async ({ account, profile, user }) => {
      if (account?.provider === 'google') {
        // <사용자 확인 후 회원가입 또는 로그인...>
        try {
          // 사용자 확인
          const type = (await _existUser(user.email as string))
            ? 'oauth/login'
            : 'oauth/signup'
          // 회원가입 또는 로그인
          const _user = await _signIn(type, {
            displayName: user.name as string,
            email: user.email as string,
            profileImg: user.image as string
          })
          Object.assign(user, _user) // jwt 콜백의 user 속성과 병합
          return !!profile?.email_verified
        } catch (error) {
          if (error instanceof Error) {
            return `/error?message=${encodeURIComponent(error.message)}`
          }
        }
      }
      return true
    },
    /**
     * 페이지 이동 시 호출 → 반환값은 리다이렉션될 URL
     * @param url 다음과 같을 수 있습니다.
     * '/abc'
     * '/abc?callbackUrl=/xyz'
     * 'https://heropy.dev/abc?callbackUrl=/xyz'
     * 'https://heropy.dev/abc?callbackUrl=https://heropy.dev/xyz'
     * ‼️signIn(공급자, 옵션) 함수를 호출할 때 redirectTo 옵션을 사용하지 않도록 주의‼️
     */
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url) {
        const { search, origin } = new URL(url)
        const callbackUrl = new URLSearchParams(search).get('callbackUrl')
        if (callbackUrl)
          return callbackUrl.startsWith('/')
            ? `${baseUrl}${callbackUrl}`
            : callbackUrl
        if (origin === baseUrl) return url
      }
      return baseUrl
    },
    /* JWT 생성/업데이트 시 호출 → 반환값은 암호화되어 쿠키에 저장 → session 함수의 token 변수로 전달 */
    jwt: async ({ token, user, trigger, session }) => {
      /* if (user) {
        Object.assign(token, user)
      } */

      if (user?.accessToken) {
        token.accessToken = user.accessToken
      }

      if (trigger === 'update' && session) {
        // Object.assign(token, session.user)
        token = { ...token, ...session.user }
        token.picture = session.user.image // 사진을 변경했을 때 반영!
      }
      return token
    },
    /* 세션 확인 시마다 호출(여러번 가능) → jwt 콜백의 반환 token 을 받음 → 각 페이지에서 세션 정보 사용 가능 */
    session: async ({ session, token }) => {
      if (token?.accessToken) {
        session.accessToken = token.accessToken
      }
      // session = { ...session, ...token }
      return session
    }
  }
})

/** 사용자 확인 */
async function _existUser(email: string) {
  const res = await fetch(`${process.env.HEROPY_API_URL}/auth/exists`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.HEROPY_API_KEY,
      username: process.env.HEROPY_API_USERNAME,
      email
    },
    cache: 'no-store'
  })
  return (await res.json()) as boolean
}

/** 회원가입 또는 로그인 */
async function _signIn(
  type: 'signup' | 'login' | 'oauth/signup' | 'oauth/login',
  body: {
    displayName?: string
    email: string
    profileImg?: string
    password?: string
  }
) {
  const res = await fetch(`${process.env.HEROPY_API_URL}/auth/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.HEROPY_API_KEY,
      username: process.env.HEROPY_API_USERNAME
    },
    body: JSON.stringify(body)
    // cache: 'no-store'    // TODO: oauth 용??
  })
  // const data = (await res.json()) as ResponseValue | string
  const data = await res.json()

  if (res.ok && typeof data !== 'string') {
    const { user, accessToken } = data
    return {
      id: user.id,
      email: user.email,
      name: user.displayName,
      image: user.profileImg,
      accessToken
    }
  }

  throw new Error(
    (data || '문제가 발생했습니다, 잠시 후 다시 시도하세요.') as string
  )
}
