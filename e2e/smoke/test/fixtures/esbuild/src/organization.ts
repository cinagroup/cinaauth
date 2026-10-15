import { CinaAuth } from "cinaauth/minimal";
import { organization } from "cinaauth/plugins";

export const auth = CinaAuth({ plugins: [organization()] });
