import { useTranslation } from "react-i18next";
import LegalLayout, { Section, Para, Bullets } from "../components/LegalLayout";

export default function Terms() {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en");

  return (
    <LegalLayout title={en ? "Terms of Use" : "Conditions Générales d'Utilisation (CGU)"}>
      {en ? (
        <>
          <Section>1. Purpose of the Service</Section>
          <Para>
            Darbeldar is a digital platform that connects its members so they can arrange temporary
            home exchanges for tourism or personal purposes. Darbeldar is neither a real estate
            agency, nor a tour operator, nor a rental intermediary. Our role is limited to
            facilitating the connection and communication between members.
          </Para>

          <Section>2. Eligibility and Registration</Section>
          <Para>
            To use Darbeldar, you must be of legal age. You must be the legal owner of the home
            offered for exchange. If you are a tenant, you certify that you have obtained the express
            written authorization of your landlord to lend the home, in accordance with applicable
            Algerian law.
          </Para>

          <Section>3. Commitments and Conduct</Section>
          <Para>As a member, you agree to:</Para>
          <Bullets
            items={[
              "Provide accurate information and photos that truthfully reflect your home.",
              "Respect other members' homes (cleanliness, house rules, care of amenities).",
              "Not use the platform for commercial or illegal activities.",
            ]}
          />
          <Para>
            Darbeldar reserves the right to suspend or delete the account of any user who does not
            comply with these rules.
          </Para>

          <Section>4. Insurance</Section>
          <Para>
            Home exchange is based on trust and individual responsibility. Darbeldar does not
            currently provide insurance covering material damage or bodily injury. It is the sole
            responsibility of each member to verify that their comprehensive home insurance covers
            guests staying free of charge.
          </Para>

          <Section>5. Limitation of Liability</Section>
          <Para>
            Darbeldar is not a party to the exchange agreements concluded between members.
            Consequently, Darbeldar disclaims all liability in the event of a dispute, last-minute
            cancellation, theft, damage, or accident occurring during an exchange.
          </Para>
        </>
      ) : (
        <>
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
        </>
      )}
    </LegalLayout>
  );
}
