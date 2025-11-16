export const LegalPage = () => {
  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Användarvillkor</h1>
      
      <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Allmänt</h2>
          <p>
            Dessa användarvillkor reglerar din användning av Dokument-AI-plattformen.
            Genom att använda tjänsten godkänner du dessa villkor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Användning av tjänsten</h2>
          <p>
            Du får använda Dokument-AI för lagliga affärsändamål. Du ansvarar för allt innehåll
            som du laddar upp till plattformen.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Immateriella rättigheter</h2>
          <p>
            Du behåller alla rättigheter till dina dokument. Vi använder endast dina dokument för
            att tillhandahålla tjänsten.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Ansvarsbegränsning</h2>
          <p>
            Dokument-AI tillhandahålls "som den är". Vi ansvarar inte för eventuella fel eller
            missförstånd i AI-genererade svar.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Uppsägning</h2>
          <p>
            Du kan när som helst avsluta ditt konto. Vi förbehåller oss rätten att stänga av
            konton som bryter mot dessa villkor.
          </p>
        </section>

        <p className="text-sm">
          Senast uppdaterad: 2024-01-15
        </p>
      </div>
    </div>
  );
};
