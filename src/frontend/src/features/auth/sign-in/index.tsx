import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SiwargaSignInForm } from './components/siwarga-sign-in-form'

export function SignIn() {
  return (
    <AuthLayout>
      <Card className='max-w-md gap-4 sm:min-w-sm'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Masuk</CardTitle>
          <CardDescription>
            Masukkan email dan kata sandi Anda di bawah ini untuk masuk ke akun
            Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiwargaSignInForm />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
