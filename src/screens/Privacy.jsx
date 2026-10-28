import logo from '../assets/pkns-logo.png';

export default function Privacy() {
  return (
    <div className="qr-page">
      <img src={logo} alt="PKNS" height="48" />
      <h1>Privacy notice</h1>
      <p>PKNS processes personal data for activations under the Personal Data Protection Act 2010. This notice is sample text in the prototype.</p>
      <p>Data is collected from forms people submit and from their participation in PKNS activations and channels. PKNS does not add third-party enrichment.</p>
      <p><a href="#/">Back</a></p>
    </div>
  );
}
