<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Tahunan {{ $data['year'] }}</title>
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
    $rp = fn ($n) => 'Rp '.number_format((float) $n, 0, ',', '.');
    $totalIncome = collect($data['monthly_data'])->sum('total_income');
    $totalExpense = collect($data['monthly_data'])->sum('total_expense');
@endphp
<div class="kop">
    <h1>SIWarga &mdash; Laporan Kas RT</h1>
    <p>Laporan Tahunan Periode Tahun {{ $data['year'] }}</p>
</div>

<h2>Ringkasan</h2>
<table class="summary">
    <tr><td>Total Pemasukan Setahun</td><td class="right">{{ $rp($totalIncome) }}</td></tr>
    <tr><td>Total Pengeluaran Setahun</td><td class="right">{{ $rp($totalExpense) }}</td></tr>
    <tr><td>Saldo Tahun Berjalan</td><td class="right">{{ $rp($data['year_balance']) }}</td></tr>
</table>

<h2>Rincian Per Bulan</h2>
<table>
    <thead>
    <tr><th>Bulan</th><th>Pemasukan</th><th>Pengeluaran</th><th>Saldo</th></tr>
    </thead>
    <tbody>
    @foreach ($data['monthly_data'] as $row)
        <tr>
            <td>{{ $bulan[$row['month']] ?? $row['month'] }}</td>
            <td class="right">{{ $rp($row['total_income']) }}</td>
            <td class="right">{{ $rp($row['total_expense']) }}</td>
            <td class="right">{{ $rp($row['balance']) }}</td>
        </tr>
    @endforeach
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
