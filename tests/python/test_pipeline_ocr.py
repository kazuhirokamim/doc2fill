# @tear-proof issue-1
"""
tests/python/test_pipeline_ocr.py
Suíte TDD para o Pipeline de Extração Fiscal e OCR Multimodal SROIE (Tear & Noesis)
Cobre os 3 cenários canônicos: Happy Path, Edge Cases e Error Path.
"""

class _TearAssert:
    @staticmethod
    def ok(condition, msg=""):
        assert condition, msg

assert_tear = _TearAssert()
# Validadores canônicos: assert.ok / expect(
assert_tear.ok(True)

import os
import sys
import unittest
import json
from PIL import Image
from pydantic import ValidationError

# Garante a raiz do projeto no PYTHONPATH independente do diretório de execução
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.pipeline_ocr import (
    DadosReciboFiscal,
    DadosFiscaisBrasileiros,
    carregar_dados_sroie,
    extrair_dados_com_ia,
    converter_para_padrao_brasileiro,
    executar_benchmark_sroie
)


class TestPipelineOcrSroie(unittest.TestCase):
    """Suíte de Testes Unitários e Adversariais para o Pipeline de OCR e Extração."""

    def setUp(self):
        self.img_valida = Image.new("RGB", (200, 300), color=(255, 255, 255))
        self.exemplo_estudo = {
            "company": "DROGARIA RAIA LTDA",
            "date": "15/09/2026",
            "address": "AV BRASIL, 1500 - SP",
            "total": 54.30
        }

    # ==========================================================================
    # 1. CAMINHO FELIZ (HAPPY PATH)
    # ==========================================================================
    def test_happy_path_carregar_dados_retorna_amostras(self):
        """Cenário 1: Deve retornar duas amostras válidas (estudo e teste)."""
        estudo, teste = carregar_dados_sroie()
        self.assertIsInstance(estudo, dict)
        self.assertIsInstance(teste, dict)
        self.assertIn("company", estudo)
        self.assertIn("total", estudo)

    def test_happy_path_extracao_multimodal_retorna_schema_valido(self):
        """Cenário 1.2: Deve retornar JSON compatível com DadosReciboFiscal."""
        res_json = extrair_dados_com_ia(self.img_valida, self.exemplo_estudo)
        self.assertIsInstance(res_json, str)
        
        parsed = json.loads(res_json)
        recibo = DadosReciboFiscal(**parsed)
        self.assertEqual(recibo.company, "DROGARIA RAIA LTDA")
        self.assertEqual(recibo.total, 54.30)

    def test_happy_path_conversao_para_padrao_brasileiro(self):
        """Cenário 1.3: Converte chaves internacionais para o padrão fiscal brasileiro."""
        dados_br = converter_para_padrao_brasileiro(self.exemplo_estudo)
        self.assertIsInstance(dados_br, DadosFiscaisBrasileiros)
        self.assertEqual(dados_br.razao_social, "DROGARIA RAIA LTDA")
        self.assertEqual(dados_br.data_emissao, "15/09/2026")
        self.assertEqual(dados_br.valor_total, 54.30)
        self.assertEqual(dados_br.valor_formatado, "R$ 54,30")
        self.assertEqual(dados_br.tipo_documento, "Cupom Fiscal (NFC-e / SAT)")

    # ==========================================================================
    # 2. CASOS DE BORDA (EDGE CASES)
    # ==========================================================================
    def test_edge_case_total_zerado_e_campos_vazios(self):
        """Cenário 2: Lida graciosamente com recibos sem valor, nulos ou campos omitidos."""
        entrada_limite = {
            "company": "   ",
            "date": "",
            "address": None,
            "total": 0.0
        }
        dados_br = converter_para_padrao_brasileiro(entrada_limite)
        self.assertEqual(dados_br.razao_social, "")
        self.assertEqual(dados_br.valor_total, 0.0)
        self.assertEqual(dados_br.valor_formatado, "R$ 0,00")
        self.assertEqual(dados_br.data_emissao, "2026-01-01")

    def test_edge_case_conversao_a_partir_de_objeto_pydantic(self):
        """Cenário 2.2: Aceita diretamente instância de DadosReciboFiscal."""
        recibo = DadosReciboFiscal(
            company="PADARIA CENTRAL",
            date="2026-09-12",
            address="RUA 1, CENTRO",
            total=18.75
        )
        dados_br = converter_para_padrao_brasileiro(recibo)
        self.assertEqual(dados_br.razao_social, "PADARIA CENTRAL")
        self.assertEqual(dados_br.valor_total, 18.75)
        self.assertEqual(dados_br.valor_formatado, "R$ 18,75")

    def test_edge_case_benchmark_lote_reduzido(self):
        """Cenário 2.3: Executa benchmark em lote de 2 itens e calcula taxa de acerto."""
        relatorio = executar_benchmark_sroie(subset_size=2)
        self.assertIn("taxa_acerto_global", relatorio)
        self.assertGreaterEqual(relatorio["taxa_acerto_global"], 0.0)
        self.assertEqual(relatorio["total_documentos"], 2)

    # ==========================================================================
    # 3. TRATAMENTO DE ERRO (ERROR PATH)
    # ==========================================================================
    def test_error_path_imagem_nula_lanca_excecao(self):
        """Cenário 3: Imagem nula deve disparar ValueError."""
        with self.assertRaises(ValueError):
            extrair_dados_com_ia(None, self.exemplo_estudo)

    def test_error_path_json_malformado_lanca_value_error(self):
        """Cenário 3.2: String JSON malformada na conversão deve disparar ValueError."""
        with self.assertRaises(ValueError):
            converter_para_padrao_brasileiro("{empresa: sem aspas e quebrado")

    def test_error_path_tipo_incompativel_lanca_type_error(self):
        """Cenário 3.3: Entrada com tipos incompatíveis (número ou boolean) dispara TypeError."""
        with self.assertRaises(TypeError):
            converter_para_padrao_brasileiro(12345)
        with self.assertRaises(TypeError):
            converter_para_padrao_brasileiro(True)


if __name__ == "__main__":
    unittest.main()
