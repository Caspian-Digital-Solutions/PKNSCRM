import { useStore, ROLES } from '../store.jsx';
import logo from '../assets/pkns-logo.png';
import { go } from '../router.js';

export default function Login() {
  const { dispatch } = useStore();
  const choose = (id) => { dispatch({ type: 'role', role: id }); go(ROLES[id].landing); };
  return (
    <div className="login">
      <div className="login-card">
        <img className="login-logo" src={logo} alt="PKNS" />
        <h1>Asset Marketing Hub</h1>
        <p className="lead">One view of every PKNS asset: what is vacant, what marketing is bringing in, and which ringgit became a tenancy.</p>
        <p className="choose">Choose a view</p>
        <div className="roles">
          {Object.values(ROLES).map((r) => (
            <button key={r.id} className="role-card" onClick={() => choose(r.id)}>
              <span className="role-card-name">{r.name}</span>
              <span className="role-card-blurb">{r.blurb}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="login-foot">Prototype by Caspian Digital Solutions · Demo data</p>
    </div>
  );
}
