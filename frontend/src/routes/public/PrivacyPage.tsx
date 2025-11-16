export const PrivacyPage = () => {
  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Integritetspolicy</h1>
      
      <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Inledning</h2>
          <p>
            Denna integritetspolicy förklarar hur Dokument-AI samlar in, använder och skyddar
            dina personuppgifter.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Vilka uppgifter vi samlar in</h2>
          <p>
            Vi samlar in följande uppgifter:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Kontaktinformation (namn, e-post)</li>
            <li>Företagsinformation</li>
            <li>Användningsdata från plattformen</li>
            <li>Dokumentinnehåll som du laddar upp</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Hur vi använder uppgifterna</h2>
          <p>
            Dina uppgifter används för att:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Tillhandahålla och förbättra tjänsten</li>
            <li>Hantera ditt konto</li>
            <li>Kommunicera med dig om tjänsten</li>
            <li>Efterleva lagkrav</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Dataskydd</h2>
          <p>
            Vi använder industristandarder för kryptering och säkerhet. Dina dokument lagras
            säkert och behandlas enligt GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Dina rättigheter</h2>
          <p>
            Du har rätt att:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Få tillgång till dina uppgifter</li>
            <li>Korrigera felaktiga uppgifter</li>
            <li>Radera dina uppgifter</li>
            <li>Exportera dina uppgifter</li>
            <li>Invända mot behandling</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Kontakt</h2>
          <p>
            För frågor om integritet, kontakta oss på privacy@dokument-ai.se
          </p>
        </section>

        <p className="text-sm">
          Senast uppdaterad: 2024-01-15
        </p>
      </div>
    </div>
  );
};
