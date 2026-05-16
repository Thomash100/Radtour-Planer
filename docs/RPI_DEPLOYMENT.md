# Raspberry Pi Testinstallation

Diese Anleitung ist fuer eine lokale Testversion auf einem Raspberry Pi gedacht. Sie nutzt Docker Compose mit PostgreSQL/PostGIS, Redis, App und Worker.

## 1. Repository auf GitHub hochladen

Auf deinem Windows-Rechner im Projektordner:

```powershell
cd D:\Users\ThomasHofmann\Downloads\Radtour-Planer
git init
git branch -M main
git remote add origin https://github.com/Thomash100/Radtour-Planer.git
git add .
git commit -m "Initial BikeTripHub MVP"
git push -u origin main
```

Falls `origin` schon existiert:

```powershell
git remote set-url origin https://github.com/Thomash100/Radtour-Planer.git
```

## 2. Raspberry Pi vorbereiten

Auf dem Raspberry Pi:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Danach einmal abmelden und wieder anmelden, damit die Docker-Gruppe aktiv wird.

## 3. Projekt klonen

```bash
git clone https://github.com/Thomash100/Radtour-Planer.git
cd Radtour-Planer
cp .env.rpi.example .env
```

In `.env` mindestens das Passwort anpassen:

```env
POSTGRES_PASSWORD=dein-sicheres-testpasswort
NEXT_PUBLIC_APP_URL=http://<rpi-ip>:3000
```

Die IP bekommst du zum Beispiel mit:

```bash
hostname -I
```

## 4. Testversion starten

```bash
docker compose -f docker-compose.rpi.yml up --build -d
```

Logs ansehen:

```bash
docker compose -f docker-compose.rpi.yml logs -f app
```

App oeffnen:

```text
http://<rpi-ip>:3000
```

## 5. Wichtige Testseiten

- `/` Startseite
- `/planer` Route planen
- `/partner` Partnerprofil anlegen
- `/partner/dashboard` Partner-Dashboard
- `/admin/partner` Partner freischalten
- `/dashboard/routen` gespeicherte Routen

## 6. Updates einspielen

```bash
git pull
docker compose -f docker-compose.rpi.yml up --build -d
```

## 7. Stoppen

```bash
docker compose -f docker-compose.rpi.yml down
```

Mit Datenbankloeschung:

```bash
docker compose -f docker-compose.rpi.yml down -v
```

## Hinweise

- Die RPI-Datei nutzt `Dockerfile.rpi` und startet Next.js im Produktionsmodus.
- Beim App-Start werden Prisma-Client, Schema-Push und Seed-Daten ausgefuehrt.
- Das ist fuer eine Testversion bequem. Fuer Produktion sollten Migrationen, Secrets, Backups, Auth und HTTPS sauber getrennt werden.
