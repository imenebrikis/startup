import LegalLayout, { Section, Para, Bullets } from "../components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation (CGU)">
      <Section>1. Objet du Service</Section>
      <Para>
        Darbeldar est une plateforme numérique de mise en relation permettant à ses membres
        d'organiser des échanges temporaires de logements à des fins touristiques ou personnelles.
        Darbeldar n'est ni une agence immobilière, ni un voyagiste, ni un intermédiaire de location.
        Notre rôle se limite à faciliter la connexion et la communication entre les membres.
      </Para>

      <Section>2. Éligibilité et Inscription</Section>
      <Para>
        Pour utiliser Darbeldar, vous devez être majeur. Vous devez être le propriétaire légal du
        logement proposé à l'échange. Si vous êtes locataire, vous certifiez avoir obtenu
        l'autorisation expresse et écrite de votre propriétaire pour prêter le logement,
        conformément à la législation algérienne en vigueur.
      </Para>

      <Section>3. Engagements et Comportement</Section>
      <Para>En tant que membre, vous vous engagez à :</Para>
      <Bullets
        items={[
          "Fournir des informations exactes et des photos fidèles à la réalité de votre logement.",
          "Respecter les logements des autres membres (propreté, règles de la maison, gestion des équipements).",
          "Ne pas utiliser la plateforme pour des activités commerciales ou illégales.",
        ]}
      />
      <Para>
        Darbeldar se réserve le droit de suspendre ou de supprimer le compte de tout utilisateur ne
        respectant pas ces règles.
      </Para>

      <Section>4. Assurances</Section>
      <Para>
        L'échange de maison repose sur la confiance et la responsabilité individuelle. Darbeldar ne
        fournit actuellement pas d'assurance couvrant les dommages matériels ou corporels. Il est de
        la responsabilité exclusive de chaque membre de vérifier que son assurance multirisque
        habitation couvre les invités à titre gratuit.
      </Para>

      <Section>5. Limitation de Responsabilité</Section>
      <Para>
        Darbeldar n'est pas partie prenante des accords d'échange conclus entre les membres. Par
        conséquent, Darbeldar décline toute responsabilité en cas de litige, d'annulation de
        dernière minute, de vol, de dégradation ou d'accident survenant pendant un échange.
      </Para>
    </LegalLayout>
  );
}
