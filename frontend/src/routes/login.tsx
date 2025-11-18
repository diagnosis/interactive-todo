import {createFileRoute, useNavigate} from '@tanstack/react-router'
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
              <form onSubmit={handleSubmit}>
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
                  <label className="block mt-2 text-sm font-medium text-gray-700 mb1">Password</label>
                  <input
                      type="password"
                      placeholder="password"
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required/>
                  <button
                      type="submit"
                      className="w-full mt-2 py-2 px-4 bg-blue-500 font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >Sign in</button>
              </form>
          </div>
      </div>
  )
}
