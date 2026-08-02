// Ta komponenta predstavlja informativno stran o storitvi.
// Uporabniku na pregleden način pojasni namen storitve,
// vir podatkov, omejitve sistema in osnovne informacije o projektu.

import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-card">
        {/* Glavni naslov strani. */}
        <h1>O storitvi</h1>

        {/* Uvodni opis uporabniku na kratko pojasni namen aplikacije. */}
        <p className="about-lead">
          Aplikacija je brezplačna storitev, ki jo je v okviru projektnega dela razvil
          študent Fakultete za matematiko, naravoslovje in informacijske tehnologije
          (FAMNIT) Univerze na Primorskem (Koper, Slovenija).
          <p>
          Aplikacija uporabniku pomaga poiskati osebne zdravnike glede na
          izbrana mesta in kategorije ter omogoča spremljanje iskalnih kriterijev
          prek naročnin na obvestila.
          </p>
          <p>
          Stran je pripravljena kot enostaven in pregleden vmesnik za iskanje
          ter spremljanje podatkov o zdravnikih.
          </p>
          <p>
          Glavni cilj projekta je uporabniku ponuditi hitrejšo orientacijo med
          podatki in jasnejšo pot do iskanja.
          </p>
          </p>

        {/* Prvi vsebinski blok pojasni, kaj storitev omogoča. */}
        <section className="about-section">
          <h2>Kako deluje storitev</h2>
          <p>
            Uporabnik izbere mesta in kategorije zdravnikov, nato pa aplikacija
            prikaže rezultate iskanja glede na razpoložljive podatke.

            Iskanje je mogoče uporabljati brez registracije.
            Registracija je potrebna le, če želi uporabnik izbrano iskanje
            shraniti kot naročnino na obvestila — v tem primeru je treba
            ob registraciji vnesti iskalne kriterije in način prejemanja obvestil.
          </p>
          <p>
            Po prijavi lahko uporabnik svoje naročnine in nastavitve
            obveščanja kadarkoli spremeni ali prekliče.
          </p>
        </section>

        {/* Ta blok pojasni, od kod prihajajo podatki. */}
        <section className="about-section">
          <h2>Vir podatkov</h2>
          <p>
            Podatki v aplikaciji temeljijo na datotekah, ki jih
            Zavod za zdravstveno zavarovanje Slovenije (ZZZS)
            dnevno objavlja na svoji uradni spletni strani.

            Aplikacija lahko zagotovi zgolj natančnost prenosa podatkov
            s strani ZZZS v aplikacijo — ne razpolagamo pa s podatki
            o dejanskem številu prostih mest pri posameznem osebnem
            zdravniku za opredelitev novih pacientov.
          </p>
          <p>
            Namen aplikacije je olajšati pregled podatkov in poenostaviti iskanje,
            ne pa nadomestiti uradnih virov ali postopkov.
          </p>
        </section>

        {/* Ta blok jasno opiše omejitve in odgovornost. */}
        <section className="about-section">
          <h2>Omejitve in odgovornost</h2>
          <p>
            Aplikacija ne more jamčiti, da bo izbrani zdravnik dejansko na voljo
            za opredelitev ali sprejem novih pacientov v trenutku ogleda.
          </p>
          <p>
            Prikazani podatki so informativne narave, zato naj uporabnik pomembne
            odločitve vedno preveri tudi pri uradnem viru ali izvajalcu.
          </p>
        </section>

        {/* Glavno dejanje na strani je povratek na iskanje. */}
        <div className="about-actions">
          <Link to="/" className="secondary-button">
            Nazaj na iskanje
          </Link>
        </div>
      </section>
    </main>
  )
}