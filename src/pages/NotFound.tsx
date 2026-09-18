import { Link } from 'react-router-dom'
import SectionHeader from '@/components/ui/SectionHeader'

export default function NotFound() {
  return (
    <section>
      <SectionHeader kicker="Error 404 — Halaman Tidak Ditemukan" title="Entri ini tidak ada di buku besar" />
      <div className="panel ledger-grid p-8 md:p-12">
        <p className="num font-display text-6xl font-black leading-none tracking-[-0.04em] text-foreground md:text-8xl">
          404
        </p>
        <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Alamat yang Anda buka tidak terdaftar pada aplikasi ini. Periksa kembali tautannya, atau kembali ke dashboard
          untuk melanjutkan pencatatan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="btn-primary min-h-[40px]">
            Kembali ke Dashboard
          </Link>
          <Link to="/transaksi" className="btn-ghost min-h-[40px]">
            Buka Transaksi
          </Link>
        </div>
      </div>
    </section>
  )
}
