import { Neuron } from "./index.js";
import { IEqualableAndStringifyable } from "./utils.js";

export class Link<T extends IEqualableAndStringifyable<T>> {
  /**
   * Create a Link object
   * @param {number} innovationId 
   * @param {Neuron} from Neuron object from which the link is starting
   * @param {Neuron} to Neuron object to which the link is finishing
   * @param {number} weight weight of the link
   * @param {Boolean?} enabled whether the link is enabled. Default = true
   * @returns {Link} link
   */
  constructor(
    public innovationId: number,
    public from: Neuron<T>,
    public to: Neuron<T>,
    public weight: number,
    public enabled: boolean = true,
  ) { }

  /**
   * Clone a gene.
   * @param {Gene} gene 
   * @returns 
   */
  clone() {
    return new Link(
      this.innovationId,
      this.from,
      this.to,
      this.weight,
      this.enabled
    );
  }
}
