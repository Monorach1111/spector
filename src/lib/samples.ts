import type { Mode } from '../types'

export interface Sample {
  id: string
  title: string
  text: string
}

export const SAMPLES: Record<Mode, Sample[]> = {
  chat: [
    {
      id: 'chat-undian',
      title: 'Undian berhadiah',
      text: 'Selamat! Nomor Anda menang undian Rp50.000.000 dari Telkomsel. Klik http://bit.ly/klaim-hadiah88 untuk klaim hadiah sebelum 24 jam. Jangan beritahu siapa-siapa!',
    },
    {
      id: 'chat-otp',
      title: 'Bank minta OTP',
      text: 'Yth nasabah BCA, rekening Anda akan diblokir hari ini karena verifikasi gagal. Segera kirim kode OTP yang masuk ke HP Anda ke nomor ini untuk verifikasi. Terima kasih.',
    },
    {
      id: 'chat-kerja',
      title: 'Lowongan minta deposit',
      text: 'Dibutuhkan karyawan paruh waktu, gaji Rp500.000/hari, kerja dari HP saja, tanpa modal. Syarat: deposit Rp150.000 dulu untuk aktivasi akun kerja. Minat? Hubungi admin sekarang.',
    },
    {
      id: 'chat-aman',
      title: 'Chat kantor (aman)',
      text: 'Halo, ini Budi dari kantor. Rapat besok jam 09.00 di ruang 3 ya, tolong bawa laporan mingguannya. Terima kasih.',
    },
  ],
  label: [
    {
      id: 'label-mie',
      title: 'Mie instan',
      text: 'Mie Instan Rasa Ayam Bawang, berat bersih 85g. Komposisi: tepung terigu, minyak sawit, garam, gula 2g, bumbu. Mengandung alergen: gluten, kedelai. Baik digunakan sebelum: 12 Des 2027. Halal.',
    },
    {
      id: 'label-teh',
      title: 'Teh manis botol',
      text: 'Teh Manis Botol 350ml. Komposisi: air, gula 24g, teh, pengawet. Gula total 24g per sajian. Baik digunakan sebelum: 03 Mar 2027.',
    },
    {
      id: 'label-paracetamol',
      title: 'Paracetamol 500 mg',
      text: 'Paracetamol 500 mg, 10 tablet. Komposisi tiap tablet: paracetamol 500 mg. Indikasi: meredakan demam dan nyeri. Simpan di bawah 30°C, jauhkan dari anak-anak. Exp: 03/2028.',
    },
    {
      id: 'label-susu',
      title: 'Susu UHT coklat',
      text: 'Susu UHT Rasa Coklat 200ml. Komposisi: susu sapi segar, gula 12g, coklat bubuk. Mengandung alergen: susu. Baik digunakan sebelum: 20 Jan 2027. Halal.',
    },
  ],
}
