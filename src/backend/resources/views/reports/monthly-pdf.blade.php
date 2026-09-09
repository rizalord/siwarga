<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Bulanan {{ $data['month'] }}/{{ $data['year'] }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111; }
        .kop { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
        .kop h1 { font-size: 18px; margin: 0; }
        .kop p { margin: 2px 0; font-size: 11px; }
        h2 { font-size: 14px; margin: 14px 0 6px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #555; padding: 4px 6px; text-align: left; }
        th { background: #eee; }
        .right { text-align: right; }
        .summary td { font-weight: bold; }
        .sign { width: 100%; margin-top: 24px; }
        .sign td { border: none; text-align: center; width: 50%; }
    </style>
</head>
<body>
@php
    $bulan = [1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'];
    $namaBulan = $bulan[$data['month']] ?? $data['month'];
    $rp = fn ($n) => 'Rp '.number_format((float) $n, 0, ',', '.');
@endphp
<div class="kop">
    <h1>SIWarga &mdash; Laporan Kas RT</h1>
    <p>Laporan Bulanan Periode {{ $namaBulan }} {{ $data['year'] }}</p>
</div>

<h2>Ringkasan</h2>
<table class="summary">
    <tr><td>Total Pemasukan</td><td class="right">{{ $rp($data['total_income']) }}</td></tr>
    <tr><td>Total Pengeluaran</td><td class="right">{{ $rp($data['total_expense']) }}</td></tr>
    <tr><td>Saldo</td><td class="right">{{ $rp($data['balance']) }}</td></tr>
</table>

<h2>Rincian Pemasukan ({{ $data['payments']->count() }})</h2>
<table>
    <thead>
    <tr><th>#</th><th>Tanggal</th><th>Jenis Iuran</th><th>Jumlah</th></tr>
    </thead>
    <tbody>
    @forelse ($data['payments'] as $i => $payment)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ optional($payment->payment_date)->format('d-m-Y') }}</td>
            <td>{{ $payment->bill?->dueType?->name ?? '-' }}</td>
            <td class="right">{{ $rp($payment->amount_paid) }}</td>
        </tr>
    @empty
        <tr><td colspan="4" style="text-align:center">Tidak ada pemasukan pada periode ini.</td></tr>
    @endforelse
    </tbody>
</table>

<h2>Rincian Pengeluaran ({{ $data['expenses']->count() }})</h2>
<table>
    <thead>
    <tr><th>#</th><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Jumlah</th></tr>
    </thead>
    <tbody>
    @forelse ($data['expenses'] as $i => $expense)
        <tr>
            <td>{{ $i + 1 }}</td>
            <td>{{ optional($expense->expense_date)->format('d-m-Y') }}</td>
            <td>{{ $expense->category?->name ?? '-' }}</td>
            <td>{{ $expense->description }}</td>
            <td class="right">{{ $rp($expense->amount) }}</td>
        </tr>
    @empty
        <tr><td colspan="5" style="text-align:center">Tidak ada pengeluaran pada periode ini.</td></tr>
    @endforelse
    </tbody>
</table>

<table class="sign">
    <tr>
        <td>Ketua RT<br><br><br><br>( ............................ )</td>
        <td>Bendahara<br><br><br><br>( ............................ )</td>
    </tr>
    <tr><td colspan="2">Dicetak pada {{ now()->format('d-m-Y H:i') }}</td></tr>
</table>
</body>
</html>
