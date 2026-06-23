import { Modal } from 'antd'
import { textToBase64Barcode } from './Util'

const printBatchSerialMaterial = ({ items, companyInfo }) => {
  Modal.info({
    width: 400,
    icon: null,
    okText: 'Print',
    onOk: () => {
      const width = '2in'
      const height = '1in'

      const content = document.getElementById('print-batch-serial-material')
      const pri = document.getElementById('batch-serial-material-iframe').contentWindow
      pri.document.open()
      pri.document.write(
        `<html>
          <head>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
              @page {
                size: ${width} ${height};
                margin: 0;
              }
              
              body {
                margin: 0;
                font-family: Roboto, sans-serif;
                font-weight: 400;
              }
              
              .print-border {
                height: ${height};
              }

              img {
                width: 90% !important;
                height: 30px !important;
              }

              h4 {
                font-size: 12px;
              }
              
              h5 {
                font-size: 8px;
              }
            </style>
          </head>
          ${content.innerHTML}

        </html>`
      )
      pri.document.close()
      pri.focus()
      setTimeout(() => {
        pri.print()
      }, 200)
    },
    okCancel: true,
    content: (
      <div>
        <div id="print-batch-serial-material">
          {items.map((item, i) => (
            <div
              key={i}
              className="print-border"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pageBreakInside: 'avoid'
              }}>
              <img
                alt=""
                src={textToBase64Barcode(item.serialNo || item.batchNo || item.materialCode, {
                  width: 4,
                  height: 80,
                  margin: 0,
                  displayValue: true,
                  fontSize: 40,
                  font: 'Roboto, sans-serif',
                  fontOptions: 'bold'
                })}
                style={{
                  objectFit: 'contain'
                }}
                width="100%"
              />
              <table>
                <tbody>
                  <tr>
                    <td align="center">
                      <h4 style={{ margin: 0 }}>{companyInfo?.name}</h4>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <iframe
          title="Print window"
          id="batch-serial-material-iframe"
          style={{
            border: 0,
            height: 0,
            width: 0,
            position: 'absolute'
          }}
        />
      </div>
    )
  })
}

export default printBatchSerialMaterial
