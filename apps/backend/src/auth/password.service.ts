import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

/** argon2id with the library's defaults, which follow current OWASP recommendations. */
@Injectable()
export class PasswordService {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  /**
   * Used when the email does not exist: costs the same time as a real check, so response
   * time does not reveal which emails have an account.
   */
  async verifyAgainstDummy(password: string): Promise<false> {
    this.dummyHash ??= this.hash("timing-equalizer-not-a-real-password");
    await argon2.verify(await this.dummyHash, password);
    return false;
  }
}
