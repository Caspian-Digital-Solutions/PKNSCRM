import logo from '../assets/pkns-logo.png';
import { ROLES } from '../access.js';
import { useStore } from '../store.jsx';
import { go } from '../router.js';

export default function Login() {
  const { dispatch } = useStore();
  const choose = (id) => {
    const role = ROLES[id];
    dispatch({ type: 'role', role: id, userName: role.person, roleName: role.name });
    go(role.landing);
  };
  return (
    <div className="login">
      <div className="login-card">
        <img className="login-logo" src={logo} alt="PKNS" />
        <h1>PKNS AMP Hub</h1>
        <p className="lead">One place to capture, understand and report on every PKNS audience, activation and AMP ringgit.</p>
        <div className="roles">
          {Object.values(ROLES).map((role) => (
            <button key={role.id} type="button" className="role-card" onClick={() => choose(role.id)}>
              <span className="avatar" aria-hidden="true">{role.initials}</span>
              <span className="role-card-name">{role.name}</span>
              <span className="role-person">{role.person}</span>
              <span className="role-card-blurb">{role.title}. {role.blurb}</span>
            </button>
          ))}
        </div>
        <p className="login-foot">Prototype · Demo data</p>
      </div>
    </div>
  );
}
