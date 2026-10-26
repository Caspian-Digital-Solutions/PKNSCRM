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
        <div className="roles">
          {Object.values(ROLES).map((role) => (
            <button key={role.id} className="role-card" onClick={() => choose(role.id)}>
              <span className="avatar" aria-hidden="true">{role.initials}</span>
              <span className="role-card-name">{role.name}</span>
              <span className="role-person">{role.person}</span>
              <span className="role-card-blurb">{role.title}. Opens on {role.id === 'management' ? 'Overview' : role.id === 'marketing' ? 'Marketing' : 'Enquiries'}.</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
