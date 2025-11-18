import {createFileRoute, Link, useNavigate} from '@tanstack/react-router'
import {useState} from "react";
import {useMutation} from "@tanstack/react-query";
import {authApi} from "../api/auth.ts";

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const navigate = useNavigate()

    const loginMutation = useMutation({
        mutationFn: () => authApi.login(email, password),
        onSuccess: (data) => {
            localStorage.setItem("access_token", data.access_token)
            navigate({to: "/dashboard"})
        },
        onError : (error: any) => {
            alert(error.response?.data?.error?.message || "login failed")
        }

    })

    function handleSubmit(e : React.FormEvent){
        e.preventDefault()
        loginMutation.mutate()
    }


  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
              <h2 className="text-3xl font-bold text-center mb-6">Sign In</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                      </label>
                      <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e)=> setEmail(e.target.value)}
                          className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                          required/>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                          type="password"
                          placeholder="password"
                          value={password}
                          onChange={(e)=>setPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required/>
                  </div>
                  <button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                      {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                  </button>
              </form>
              <p className="mt-4 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-blue-600 hover:text-blue-700">
                      Sign up
                  </Link>
              </p>
          </div>
      </div>
  )
}
