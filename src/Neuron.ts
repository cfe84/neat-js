import { IEqualableAndStringifyable } from "./utils.js";

export type NeuronType = "in" | "out" | "hidden";
export const neuronTypes: Record<string, NeuronType> = {
  in: "in",
  out: "out",
  hidden: "hidden"
};


export class Neuron<T extends IEqualableAndStringifyable<T>> {
  public id: string = "";
  private _neuronInnovationId: number = -2;
  constructor(
    public type: NeuronType,
    public value: T,
    neuronInnovationId: number,
  ) {
    this.neuronInnovationId = neuronInnovationId;
  }

  public set neuronInnovationId(neuronInnovationId: number) {
    this._neuronInnovationId = neuronInnovationId;
    this.id = this.getNeuronLabel();
  }

  public get neuronInnovationId() { return this._neuronInnovationId; }

  /**
   * Returns a label for the neuron
   * @param {*} neuron 
   * @returns Label
   */
  private getNeuronLabel = <T>() =>
    this.type === neuronTypes.in ? `[INPUT] ${this.value.toString()}`
      : this.type === neuronTypes.out ? `[OUTPUT] ${this.value.toString()}`
        : `[HIDDEN] #${this.neuronInnovationId}`

  public equals = (other: Neuron<T>) =>
    this.type === other.type &&
    this.neuronInnovationId === other.neuronInnovationId &&
    this.value.equals(other.value);

  public static createHiddenNeuron(neuronInnovationId: number) {
    const newNeuron = new Neuron(
      neuronTypes.hidden,
      { equals: (_) => true, toString: () => neuronInnovationId.toString() },
      neuronInnovationId);
    return newNeuron;
  }
}